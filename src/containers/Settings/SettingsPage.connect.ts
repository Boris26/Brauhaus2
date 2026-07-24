import { connect } from 'react-redux';
import { ThemeName } from '../../utils/theme';
import { ApplicationActions } from '../../actions/actions';
import {SettingsPage} from './SettingsPage';

const mapStateToProps = (state: any) => ({
    theme: state.applicationReducer.theme as ThemeName,
});

const mapDispatchToProps = (dispatch: any) => ({
    setTheme: (theme: ThemeName) => dispatch(ApplicationActions.setTheme(theme)),
});

export default connect(mapStateToProps, mapDispatchToProps)(SettingsPage);
